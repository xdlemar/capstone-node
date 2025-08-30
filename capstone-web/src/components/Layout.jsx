import Topbar from './Topbar'
import Sidebar from './Sidebar'

export default function Layout({ children }){
  return (
    <>
      <Topbar />
      <div className="layout">
        <Sidebar />
        <main className="main">{children}</main>
      </div>
    </>
  )
}
