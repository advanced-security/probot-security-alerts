FROM node:16.15-alpine3.16 as build
WORKDIR /app
COPY . .
RUN npm install
RUN npm run build
RUN npm run test

FROM node:16.15-alpine3.16
WORKDIR /app
COPY package.json ./
RUN npm i probot --location=global
RUN npm install --omit=dev
COPY --from=build /app/dist/ .
EXPOSE 3000
ENTRYPOINT ["npm", "run", "probot"]