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

PIK = "static/pickle.dat"
with open(PIK, "rb") as f:
	data = pickle.load(f)


@app.route("/old")
def home():
	street = request.args.get('street')
	fname = ''
	predict = 'unknown'
	if street:
		try:
			G = ox.gdf_from_place(street)
			gg=gpd.GeoDataFrame(G, crs={'init': 'epsg:4326'})

			plot_on_map(gg, 'r')
			f = plt.gcf()
			fname = "static/report.%.7f.png" % time()
			f.savefig(fname)

			out = to_x_y(gg).geometry.apply(find_nearest_seg, args=(data['feats'],))
			predict = data['model'].predict(data['feats'].iloc[out, 21:].values) * data['feats']['AADT'][out]
		except:
			print('Address not found')
	return render_template("index_old.html.j2", street=street, map=fname, predict=predict)


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
	# age = int(data['age'])
	# country = str(data['country'])


	# # 2. processing data 
	# # determine if Minor or Adult based on Age
	# if (age>=18):
	# 	status = 'Adult'
	# else:
	# 	status = 'Minor'

	# # 3. generate response
	# response = {'name': 'test', 'status': 'ok'}
	# response_text = json.dumps(response)

	# net = 'static/Existing_Bike_Network.geojson'
	net = 'static/map1.geojson'
	with open(net) as json_file:
		response_text = json.dumps(json.load(json_file))

	# 4. send back the response
	return Response(response_text, mimetype='application/json')

if __name__ == "__main__":
	app.run(debug=True, host='0.0.0.0', port=5000)
