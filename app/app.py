from flask import Flask, render_template, request
import pandas as pd
import numpy as np
from util import plot_on_map, to_x_y, find_nearest_seg
import osmnx as ox
import geopandas as gpd
import matplotlib.pyplot as plt
import geopandas as gpd
from time import time
import pickle
 
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


if __name__ == "__main__":
    app.run(debug=True, host='0.0.0.0', port=5000)
