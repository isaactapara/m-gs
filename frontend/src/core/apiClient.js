'use strict';

const apiEndpoint = 'https://api.example.com';

function fetchData(resource) {
    return fetch(
        `${apiEndpoint}/${resource}`,
        { method: 'GET' }
    ).then(response => response.json());
}

function postData(resource, data) {
    return fetch(
        `${apiEndpoint}/${resource}`,
        { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify(data) 
        }
    ).then(response => response.json());
}

module.exports = { fetchData, postData };