FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY server ./server

WORKDIR /app/server
RUN npm install

EXPOSE 8080
CMD ["npm", "run", "start"]
