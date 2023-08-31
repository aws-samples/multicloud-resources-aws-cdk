FROM public.ecr.aws/lambda/nodejs:18-x86_64 as builder
RUN yum install shadow-utils.x86_64 -y
RUN /usr/sbin/groupadd newuser && /usr/sbin/useradd -rm -d /home/newuser -s /bin/bash -g newuser -u 1001 newuser
USER newuser
WORKDIR /home/newuser
COPY package-lock.json index.ts  ./
COPY --chown=newuser:newuser package*.json .
RUN npm install
RUN npm run build
    

FROM public.ecr.aws/lambda/nodejs:18-x86_64
WORKDIR ${LAMBDA_TASK_ROOT}
COPY --from=builder /home/newuser/dist/* ./
CMD ["index.handler"]