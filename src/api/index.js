import axios from 'axios';

const dummyApi = axios.create({
    baseURL: 'https://my.api.mockaroo.com',
    headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-API-Key': '745186a0',
    },
});

export const getAllCoordinates = (data) => dummyApi.post('/coordinates', data);