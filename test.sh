# !/bin/sh

export FILE_SERVER_DEBUG=true
ENV="cloud"
if [[ ! -z "$1" ]]; then 
    ENV=$1
fi

# Setup
mkdir -p tmp
mkdir -p storage/logo
touch tmp/randomfile.txt


# Begin
APP_NAME=edge_file_server
if [[ $ENV = "cloud" ]]; then
echo $1
    # Compile index.ts
    bun build --compile index.ts --outfile $APP_NAME
    ./$APP_NAME  &
else
    bun run index.ts &
fi
sleep 2
bun run index_test.ts

# Kill the process
if [[ $ENV = "cloud" ]]; then
    pkill -9 -u $USER $APP_NAME
else 
    pkill -9 -u $USER bun
fi

# Cleanup
rm -r tmp storage $APP_NAME