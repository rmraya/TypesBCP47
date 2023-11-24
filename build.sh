rm -rf node_modules/
rm package-lock.json
npm install
rm -rf dist/
npm run build
cp ts/*.xml dist/
cp ts/*.txt dist/