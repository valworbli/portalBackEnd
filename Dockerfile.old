FROM node:10
RUN groupadd -r nodejs && useradd -m -r -g nodejs -s /bin/bash nodejs
RUN mkdir -p /usr/src/app && chown -R nodejs. /usr/src/app
USER nodejs
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY src ./
COPY worbli-api.js ./
EXPOSE 9000
CMD [ "npm", "start" ]