# To enable ssh & remote debugging on app service change the base image to the one below
# FROM mcr.microsoft.com/azure-functions/node:4-node18-appservice
FROM mcr.microsoft.com/azure-functions/node:4-node20

ENV AzureWebJobsScriptRoot=/home/site/wwwroot \
    AzureFunctionsJobHost__Logging__Console__IsEnabled=true

#COPY ./dist/* /home/site/wwwroot
#COPY host.json /home/site/wwwroot
COPY  --link . /home/site/wwwroot
RUN cd /home/site/wwwroot \
  && npm pkg delete 'devDependencies' \
  && npm pkg delete 'dependencies' \
  && npm pkg delete 'scripts' \
  && npm pkg delete 'files'
