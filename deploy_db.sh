#!/bin/bash
echo "🚀 Starting deployment to production..."

# 1. Transfer the dump file
echo "📦 Uploading dump.sql to srv1311817..."
scp dump.sql root@srv1311817:/root/

if [ $? -eq 0 ]; then
    echo "✅ Upload complete."
else
    echo "❌ Upload failed."
    exit 1
fi

# 2. Restore on remote server
echo "restore database on remote server..."
ssh root@srv1311817 "cat /root/dump.sql | docker exec -i macedo_postgres_prod psql -U postgres -d macedo_system"

if [ $? -eq 0 ]; then
    echo "✅ Database successfully restored on production!"
else
    echo "❌ Restore failed."
    exit 1
fi
