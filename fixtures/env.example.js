module.exports = {
    "user": {
        "providers": {
            "dropbox": {
                "credentials": {
                    "access_token": "{REQUIRED}"
                    "client_id": "{REQUIRED}"
                }
            },
            "google": {
                "credentials": {
                    //Easiest way to get this is via the playground: https://developers.google.com/oauthplayground
                    access_token: "{REQUIRED}"
                }
            }
        }
    },
    "data": {
        "local_test_step": {
            "input": {
                "file": [
                    {
                        "source": "dropbox",
                        "path": "{REQUIRED}"
                        "id": null,
                        "created": null
                    }

                ],
                "album": [
                    "Test"
                ]
            }
        }
    }
};

