from flask import Flask, render_template, request, Response
import pandas as pd
import numpy as np
from util import plot_on_map, to_x_y, find_nearest_seg
import osmnx as ox
import geopandas as gpd
import matplotlib.pyplot as plt
import geopandas as gpd
from time import time
import pickle
import json
 
app = Flask(__name__)

@app.route('/', methods=['GET','POST'])
def my_maps():
	mapbox_access_token = 'pk.eyJ1IjoibGVtYXJ0aW5ldCIsImEiOiJjanJrd2lnaWEwMmNvNDNwbjc1eDJjY2s3In0.vVz2aJQIkHZMSonwEGwLlw'
	return render_template('index.html.j2', mapbox_access_token=mapbox_access_token)


@app.route('/slides/', methods=['GET','POST'])
def slides():
	return render_template('slides.html.j2')


#################
# JSON RECEIVER
#################
@app.route('/json_receiver', methods = ['POST'])
def receiver_function():
	# 1. retrieving data sent from index.html
	data = request.get_json()
	# name = str(data['name'])

	# # 2. processing data 

	# # 3. generate response
	# response = {'name': 'test', 'status': 'ok'}
	# response_text = json.dumps(response)

	net = 'static/map1.geojson'
	with open(net) as json_file:
		response_text = json.dumps(json.load(json_file))

	# 4. send back the response
	return Response(response_text, mimetype='application/json')

if __name__ == "__main__":
	app.run(debug=True, host='0.0.0.0', port=5000)
