sed -i '' 's/"exclude": \[/"exclude": \["src\/pages","src\/components",/' tsconfig.json
tsc
sed -i '' 's/"src\/pages","src\/components",//' tsconfig.json