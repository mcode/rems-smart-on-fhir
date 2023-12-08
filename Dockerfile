FROM node:14-alpine
WORKDIR /home/node/app/rems-smart-on-fhir
COPY --chown=node:node . .
RUN npm install
EXPOSE 4040
RUN apk add --no-cache curl
HEALTHCHECK --interval=60s --timeout=10m --retries=10 CMD curl --fail http://localhost:4040 || exit 1
CMD npm run start