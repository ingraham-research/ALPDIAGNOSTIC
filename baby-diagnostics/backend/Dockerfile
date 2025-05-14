FROM node:18-slim

RUN apt-get update && apt-get install -y python3 python3-pip

WORKDIR /app

COPY . .

RUN npm install
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 3000
CMD ["node", "server.js"]
