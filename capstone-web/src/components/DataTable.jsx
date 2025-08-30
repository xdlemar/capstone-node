export default function DataTable({ columns, rows, rowKey="id" }){
  return (
    <table className="table">
      <thead><tr>{columns.map(c=><th key={c.key||c.header}>{c.header}</th>)}</tr></thead>
      <tbody>
        {rows?.length ? rows.map(r=>(
          <tr key={r[rowKey] ?? JSON.stringify(r)}>
            {columns.map(c=><td key={c.key||c.header}>{c.render? c.render(r) : r[c.key]}</td>)}
          </tr>
        )) : <tr><td colSpan={columns.length}>No data</td></tr>}
      </tbody>
    </table>
  )
}
