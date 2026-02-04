from app import create_app

app = create_app() #callint ehe create_app function to create an instance of the Flask application from app/__init__.py

if __name__ == "__main__":
    app.run(debug=True)

