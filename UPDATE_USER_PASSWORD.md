# Update User Password in Render Database

## Quick Fix: Update Password Directly in Database

Run this in the Render API service shell:

```bash
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
```

Then run this Node.js command to generate the password hash:

```bash
node -e "const bcrypt = require('bcryptjs'); bcrypt.hash('Saint214!', 10).then(hash => console.log('HASH:', hash));"
```

Copy the hash output, then update the user:

```bash
psql $DATABASE_URL -c "UPDATE \"User\" SET \"passwordHash\" = '<paste-hash-here>' WHERE email = 'leah2maria@gmail.com';"
```

## Or: Delete and Re-seed

If the user doesn't exist, delete and re-seed:

```bash
psql $DATABASE_URL -c "DELETE FROM \"User\" WHERE email IN ('leah2maria@gmail.com', 'sitter@example.com');"
cd /opt/render/project/src/enterprise-messaging-dashboard/apps/api
pnpm db:seed
```

## Verify User Exists

Check if user exists:

```bash
psql $DATABASE_URL -c "SELECT email, \"passwordHash\" IS NOT NULL as has_password FROM \"User\" WHERE email = 'leah2maria@gmail.com';"
```
