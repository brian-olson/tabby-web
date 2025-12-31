const bootstrap = () => import('./app.server.module').then(m => m.AppServerModule)

export default bootstrap
