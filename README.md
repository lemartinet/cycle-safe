# Cycle Safe

Plan a safer bike route in Boston. Project built during the Insight Data Science Fellows Program

## Tools

I used Docker and conda to run both the jupyter notebook and the app locally, and deploy to AWS Beanstalk. Docker is definitely overkill, but I wanted to use this project to learn more about it.

To launch the server:
```
docker-compose up --build flask-dash
```
Then open your browser at http://localhost:5000/

## Data

The data is coming from the city of Boston and from the Massachusetts DOT.

## Model

I currently use a logistic regression to classify a street segment into safe or risky.

