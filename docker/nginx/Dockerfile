FROM nginx:stable-alpine

RUN apk add --no-cache openssl

COPY docker/nginx/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

CMD ["/entrypoint.sh"]
