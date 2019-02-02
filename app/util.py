import contextily as ctx
import numpy as np

#########
# Helpers
#########
# Add a background map to the plot
def add_basemap(ax, zoom, url='http://tile.stamen.com/terrain/tileZ/tileX/tileY.png'):
    #xmin, xmax, ymin, ymax = ax.axis()
    xmin, xmax, ymin, ymax = -7925000, -7895000, 5195000, 5220000
    basemap, extent = ctx.bounds2img(xmin, ymin, xmax, ymax, zoom=zoom, url=url)
    ax.imshow(basemap, extent=extent, interpolation='bilinear')
    # restore original x/y limits
    ax.axis((xmin, xmax, ymin, ymax))
    
# Convert coordinates of a geopandas and plot on a bg map
def plot_on_map(geodf, col='k'):
    ax = geodf.to_crs(epsg=3857).plot(figsize=(10, 10), alpha=0.5, edgecolor=col)
    add_basemap(ax, zoom=12)
    
# Convert to WGS 84 (Ellipsoidal 2D lat/long in degree)
# See https://epsg.io/4326
def to_lat_long(geodf):
    return geodf.to_crs({'init': 'epsg:4326'})

# Convert to WGS 84 Pseudo-Mercator (cartesian 2D X/Y in meter) used in Google Maps, OpenStreetMap, ArcGIS, ESRI, ...
# See https://epsg.io/3857
def to_x_y(geodf):
    return geodf.to_crs({'init': 'epsg:3857'})

def find_nearest_seg(point, lines):
    # Found a threshold of 20m based on looking at histogram:
    # geocrash1.geometry.apply(lambda p,l: l.distance(p).min(), args=(bostonsegs,)).hist()
    dist = lines.distance(point)
    id = dist.idxmin()
    return id if dist[id] < 20 else np.nan
