# gdrive-permissions-codify

Codify permissions list for Google Drive files.

## Usage

### Prerequisite

- Create a service account
- Invite the service account to the files you want to codify
- Download the service account's credentials (e.g. `credentials.json`)
    - https://cloud.google.com/docs/authentication/production

### Example

Create the `permissions.yml` file:

```yml
version: 1
permissions:
  - fileId: 'foobar'
    resource:
      - type: 'user'
        role: 'owner'
        emailAddress: 'foo@example.com'
      - type: 'user'
        role: 'writer'
        emailAddress: 'gdrivepermissionscodify@foo.iam.gserviceaccount.com'
```

Run `gdrive-permissions-codify`:

```
gdrive-permissions-codify --permission-file ./permissions.yml --credential-file ./credentials.json
```

See `gdrive-permissions-codify --help` for the CLI options.

## Documentation

### Add a new user

Add a new resource at `permissions[].resource`:

```diff
permissions:
  - fileId: 'foo-bar-123'
    resource:
+     - type: 'user'
+       role: 'owner'
+       emailAddress: 'foo@example.com'
```

#### role

role should be one of the following avlues:

- owner
- organizer
- fileOrganizer
- writer
- commenter
- reader

Please have a look at https://developers.google.com/drive/api/v3/reference/permissions for more details.

### Update the user

```diff
permissions:
  - fileId: 'foo-bar-123'
    resource:
      - type: 'user'
-        role: 'owner'
+        role: 'viewer'
        emailAddress: 'foo@example.com'
```

### Delete the user

Simply delete the associated resource from the file.

```diff
permissions:
  - fileId: 'foo-bar-123'
    resource:
-     - type: 'user'
-       role: 'owner'
-       emailAddress: 'foo@example.com'
```

## Development

### Publish

When you bump up the `version` in `package.json` and push to `master` branch, the package will be updated to the private GitHub Packages automatically. You cannot publish to same versions.
