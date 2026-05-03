import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import * as Cesium from 'cesium';

Cesium.Ion.defaultAccessToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI5ZDhmNmE3ZC0yMjUyLTRhODUtYWU0NS0wZTc4OTE3YzRhYzgiLCJpZCI6NDE2MDc3LCJpYXQiOjE3NzU3NjQzMDd9.d80Xvl2S8NpWISaeR5gcQmR9OoMbpvCd4jkSTftIv94';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
