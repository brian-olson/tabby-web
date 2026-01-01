wsgi_app = "tabby.wsgi:application"
bind = "0.0.0.0:8000"
workers = 4
preload_app = True
sendfile = True

max_requests = 1000
max_requests_jitter = 100
