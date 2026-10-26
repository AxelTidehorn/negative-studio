if('serviceWorker' in navigator&&location.protocol!=='data:')navigator.serviceWorker.register('./cache-worker.js',{updateViaCache:'none'}).catch(e=>console.warn('Offline cache:',e));
