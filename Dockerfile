FROM keymetrics/pm2:latest-stretch
# RUN /usr/sbin/groupadd -r nodejs && /usr/sbin/useradd -m -r -g nodejs -s /bin/bash nodejs
RUN mkdir -p /usr/src/app # && chown -R nodejs. /usr/src/app
RUN mkdir -p /tmp/userdata
# USER nodejs
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY src ./src
COPY worbli-api.js ./
COPY pm2.json ./
COPY nodemon.json ./
COPY .env ./
COPY .nycrc ./
COPY .gitignore ./
COPY .eslintrc ./

EXPOSE 9000
CMD [ "pm2-runtime", "start", "pm2.json" ]
