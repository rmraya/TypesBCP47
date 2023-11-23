rm -rf node_modules/
npm install
rm -rf dist/
node_modules/.bin/tsc
cp ts/*.xml dist/
cp ts/*.txt dist/