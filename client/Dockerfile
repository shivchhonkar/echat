FROM node:20-alpine

WORKDIR /app

COPY shared ./shared
COPY client ./client

WORKDIR /app/client
RUN npm install

EXPOSE 6001
CMD ["npm", "run", "dev"]
