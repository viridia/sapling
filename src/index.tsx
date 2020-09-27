import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import { css, Global } from '@emotion/core';

ReactDOM.render(
  <React.StrictMode>
    <Global
      styles={css`
        body {
          margin: 0;
          font-family: 'Exo 2', sans-serif;
          overflow: hidden;
        }
      `}
    />
    <App />
  </React.StrictMode>,
  document.getElementById('root')
);
