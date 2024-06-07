FROM node:21-alpine
WORKDIR /home/node/app/rems-smart-on-fhir
COPY --chown=node:node . .
RUN npm install
EXPOSE 4040
CMD npm run start