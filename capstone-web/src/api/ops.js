import { alms, dtrs, plt } from "./http";


export const listAssets   = () => alms.get("/assets");                     // GET /assets
export const createAsset  = (payload) => alms.post("/assets", payload);    // POST /assets
export const getAsset     = (id) => alms.get(`/assets/${id}`);             // GET /assets/:id
export const updateAsset  = (id, payload) => alms.put(`/assets/${id}`, payload);
export const deleteAsset  = (id) => alms.delete(`/assets/${id}`);


export const listMaint    = (assetId) => alms.get(`/assets/${assetId}/maint`);
export const createMaint  = (assetId, payload) => alms.post(`/assets/${assetId}/maint`, payload);
export const completeMaint= (assetId, maintId) => alms.post(`/assets/${assetId}/maint/${maintId}/complete`);



export const listDocs     = () => dtrs.get("/documents");                  
export const createDoc    = (payload) => dtrs.post("/documents", payload); 
export const getDoc       = (id) => dtrs.get(`/documents/${id}`);
export const updateDoc    = (id, payload) => dtrs.put(`/documents/${id}`, payload);
export const archiveDoc   = (id) => dtrs.post(`/documents/${id}/archive`);


export const listDocMoves = (docId) => dtrs.get(`/documents/${docId}/moves`);
export const createDocMove= (docId, payload) => dtrs.post(`/documents/${docId}/moves`, payload);



export const listProjects = () => plt.get("/projects");                     
export const createProject= (payload) => plt.post("/projects", payload);    
export const getProject   = (id) => plt.get(`/projects/${id}`);


export const listProjectTasks  = (projectId) => plt.get(`/projects/${projectId}/tasks`);
export const createProjectTask = (projectId, payload) => plt.post(`/projects/${projectId}/tasks`, payload);
export const setTaskStatus     = (projectId, taskId, status) =>
  plt.post(`/projects/${projectId}/tasks/${taskId}/status`, { status });
