# gdrive-permissions-codify

## Usage

```
npm install --save gdrive-permissions-codify
```

```
$(npm bin)/gdrive-permissions-codify --help
```

## Publish

⚠️ Basically, please follow the automated publish workflow. Manual publish workflow is only for edge cases (e.g. you want to force publish while takinc actions at incidents, etc.).

### Automation

When you bump up the `version` in `package.json` and push to `master` branch, the package will be updated to the private GitHub Packages automatically. You cannot publish to same versions.

### Manually

Then, update `version` in `package.json` and run:

```
npm publish
```

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
