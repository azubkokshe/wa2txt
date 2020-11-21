FROM node:12
WORKDIR /usr/src/app
RUN apt-get update && apt-get install -y ffmpeg
COPY package*.json ./
RUN npm install
COPY . .
CMD [ "node", "app.js" ]