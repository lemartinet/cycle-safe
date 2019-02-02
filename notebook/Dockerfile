# base image
FROM lemartinet/jupyterbase

WORKDIR /home
RUN mkdir -p notebook

# load in the environment.yml file
COPY environment.yml .

# create the environment
RUN conda env update --file ./environment.yml
RUN conda clean --all -y

# additional pip packages if required
#COPY requirements.txt .
#RUN pip install --upgrade pip --no-cache-dir -r ./requirements.txt

# build and activate the specified conda environment from a file (defaults to 'environment.yml')
#ARG environment=environment.yml
#COPY ${environment} notebook
#RUN conda env create --file notebook/${environment} && \
#    echo ". /opt/conda/etc/profile.d/conda.sh" >> ~/.bashrc && \ 
#    echo "conda activate $(head -1 notebook/${environment} | cut -d' ' -f2)" >> ~/.bashrc
