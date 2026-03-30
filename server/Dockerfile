FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY server ./server

WORKDIR /app/server
RUN npm install

EXPOSE 4000
CMD ["npm", "run", "start"]
