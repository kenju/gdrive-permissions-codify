#!/usr/bin/env node

const fs = require('fs')

const yaml = require('js-yaml')
const { google } = require('googleapis')
const { program } = require('commander')

function eqlPermission(current, target) {
    return current.emailAddress === target.emailAddress
        && current.type === target.type
}

function shouldUpdate(current, target) {
    return current.emailAddress !== target.emailAddress
        || current.role !== target.role
        || current.type !== target.type
}

/**
 * @doc https://developers.google.com/drive/api/v3/reference/permissions/list
 */
function listPermissions(drive, fileId) {
    return new Promise((resolve, reject) => {
        drive.permissions.list({
            fileId,
            fields: 'permissions(id, type, kind, role, emailAddress)',
        }, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res.data.permissions)
            }
        })
    })
}

/**
 * @doc https://developers.google.com/drive/api/v3/reference/permissions/create
 */
function createPermission(drive, fileId, emailAddress, role, type) {
    return new Promise((resolve, reject) => {
        drive.permissions.create({
            fileId,
            requestBody: {
                role,
                type,
                emailAddress,
            },
            fields: 'id, type, kind, role, emailAddress',
        }, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res.data)
            }
        })
    })
}

/**
 * @doc https://developers.google.com/drive/api/v3/reference/permissions/update
 */
function updatePermission(drive, fileId, permissionId, role) {
    return new Promise((resolve, reject) => {
        drive.permissions.update({
            fileId,
            permissionId,
            transferOwnership: role === 'owner',
            requestBody: {
                role,
            },
            fields: 'id, type, kind, role, emailAddress',
        }, (err, res) => {
            if (err) {
                reject(err)
            } else {
                resolve(res.data)
            }
        })
    })
}

/**
 * @doc https://developers.google.com/drive/api/v3/reference/permissions/delete
 */
function deletePermission(drive, fileId, permissionId) {
    return new Promise((resolve, reject) => {
        drive.permissions.delete({
            fileId,
            permissionId,
        }, (err, _) => {
            if (err) {
                reject(err)
            } else {
                resolve(true)
            }
        })
    })
}

/**
 * @doc https://developers.google.com/identity/protocols/oauth2/scopes#drive
 */
function buildDriveClient() {
    const scopes = [
        'https://www.googleapis.com/auth/drive',
    ]
    const credentials = JSON.parse(fs.readFileSync(program.credentialFile))
    const { client_email, private_key } = credentials
    const auth = new google.auth.JWT({
        email: client_email,
        key: private_key,
        scopes,
    })
    return google.drive({ version: "v3", auth })
}

function validateDefinition(definition) {
    if (definition.version !== 1) {
        throw new Error(`v${definition.version} is not supported`)
    }
    if (!definition.permissions || definition.permissions.length === 0) {
        throw new Error('"permissions" attributes is empty')
    }
    return definition
}

function loadDefinition() {
    const definition = yaml.safeLoad(fs.readFileSync(program.permissionFile))
    if (program.debug) {
        console.log(definition)
    }
    return validateDefinition(definition)
}

async function apply() {
    const drive = buildDriveClient()
    const definition = loadDefinition()
    const permissions = await Promise.all(definition.permissions.map(async ({ fileId, resource }) => {
        const currentPermissions = await listPermissions(drive, fileId)
        return {
            fileId,
            currentPermissions,
            targetPermissions: resource,
        }
    }))

    const updates = []
    const nochanges = []
    const creates = []
    const deletes = []
    permissions.forEach((permission) => {
        const { fileId, targetPermissions, currentPermissions } = permission
        targetPermissions.forEach((targetPermission) => {
            const currentPermission = currentPermissions.find((current) => eqlPermission(current, targetPermission))
            if (currentPermission) {
                if (shouldUpdate(currentPermission, targetPermission)) {
                    updates.push({
                        fileId,
                        emailAddress: targetPermission.emailAddress,
                        permissionId: currentPermission.id,
                        role: targetPermission.role,
                        type: currentPermission.type,
                    })
                } else {
                    nochanges.push({
                        fileId,
                        emailAddress: currentPermission.emailAddress,
                        role: currentPermission.role,
                        type: currentPermission.type,
                    })
                }
            } else {
                creates.push({
                    fileId,
                    emailAddress: targetPermission.emailAddress,
                    role: targetPermission.role,
                    type: targetPermission.type,
                })
            }
        })

        currentPermissions.forEach((currentPermission) => {
            const targetPermission = targetPermissions.find((target) => eqlPermission(target, currentPermission))
            if (!targetPermission) {
                deletes.push({
                    fileId,
                    emailAddress: currentPermission.emailAddress,
                    permissionId: currentPermission.id,
                    role: currentPermission.role,
                    type: currentPermission.type,
                })
            }
        })
    })

    nochanges.forEach(({ fileId, emailAddress, role, type }) => {
        console.log(`[${fileId}] no changes for ${role}:${type}:${emailAddress}`)
    })

    const updatesResult = await Promise.all(updates.map(async ({ fileId, emailAddress, permissionId, role, type }) => {
        console.log(`[${fileId}] updating the permission for ${role}:${type}:${emailAddress} (id=${permissionId})`)
        return await updatePermission(drive, fileId, permissionId, role)
    }))
    console.log('updates=', updatesResult)

    const createsResult = await Promise.all(creates.map(async ({ fileId, emailAddress, role, type }) => {
        console.log(`[${fileId}] creating a permission for ${role}:${type}:${emailAddress}`)
        return await createPermission(drive, fileId, emailAddress, role, type)
    }))
    console.log('creates=', createsResult)

    const deletesResult = await Promise.all(deletes.map(async ({ fileId, emailAddress, permissionId, role, type }) => {
        console.log(`[${fileId}] deleting the permission for ${role}:${type}:${emailAddress} (id=${permissionId})`)
        return await deletePermission(drive, fileId, permissionId)
    }))
    console.log('deletes=', deletesResult)
}

function setupCommand() {
    program
        .option('-d, --debug', 'output extra debugging', false)
        .option('-c, --credential-file <file>', 'path to the Google API credential file', './credentials.json')
        .option('-f, --permission-file <file>', 'path to the permission file', './permissions.yml')

    program.parse(process.argv)

    if (program.debug) {
        console.log('opts=', program.opts())
    }
}

(async function () {
    setupCommand()

    try {
        await apply()
    } catch (err) {
        console.error(err)
    }
})()
