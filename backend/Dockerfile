FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN mkdir -p uploads/challenges

EXPOSE 5000

CMD ["npm", "run", "start"]
