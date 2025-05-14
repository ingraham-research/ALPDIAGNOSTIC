FROM node:18-slim

# Install Python and required build tools
RUN apt-get update && apt-get install -y \
    python3 python3-pip python3-dev \
    build-essential \
    && apt-get clean

WORKDIR /app

COPY . .

RUN npm install
RUN pip3 install --no-cache-dir -r requirements.txt

EXPOSE 3000
CMD ["node", "server.js"]
