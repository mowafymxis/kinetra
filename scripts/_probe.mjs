import('../packages/core/src/index.ts').then(()=>console.log('all-ok')).catch(e=>{console.error('err:',e.message); process.exit(1)})
