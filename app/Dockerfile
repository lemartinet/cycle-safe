FROM lemartinet/myjupyter

RUN mkdir -p /home/app
WORKDIR /home/app

# load in the environment.yml file
COPY environment.yml .

# create the environment
RUN conda env update --file ./environment.yml

# additional pip packages if required
#COPY requirements.txt /home/app
#RUN pip install --upgrade pip --no-cache-dir -r requirements.txt

# # install some js mapping tool
# RUN apt-get update
# RUN apt-get -y install curl gnupg
# RUN curl -sL https://deb.nodesource.com/setup_11.x  | bash -
# RUN apt-get -y install nodejs
# RUN npm install
# # RUN npm install --save leaflet-routing-machine
# RUN npm install --save geojson-path-finder

# copy app files
COPY ./ ./

EXPOSE 5000

CMD ["python", "app.py"]
