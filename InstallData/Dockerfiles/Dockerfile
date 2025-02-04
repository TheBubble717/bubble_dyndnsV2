FROM node:latest
WORKDIR /app



RUN apt-get update && \
    apt-get install -y git && \
    npm install -g pm2 && \
	cd /app && \
	if [ -d "bubbledns" ]; then rm -rf "bubbledns"; fi && \
	git clone https://github.com/TheBubble717/bubble_dyndnsV2.git /app/bubbledns && \
	cd /app/bubbledns && \
	npm install
	

CMD ["sh", "-c", "rm /app/bubbledns/config.json && cp /app/config.json /app/bubbledns/config.json && cd /app/bubbledns && pm2 start server.js --no-daemon"]
