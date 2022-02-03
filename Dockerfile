FROM alpine
RUN apk add --update npm
WORKDIR /app
COPY package*.json ./
RUN npm ci --ignore-scripts
ADD . ./