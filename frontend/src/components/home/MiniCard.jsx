import React from 'react'

const MiniCard = ({title, icon, number, footerNum, subtitle}) => {
  return (
    <div className='bg-panel py-5 px-5 rounded-lg w-full'>
        <div className='flex items-start justify-between'>
            <h1 className='text-main text-lg font-semibold tracking-wide'>{title}</h1>
            <button className={`${title === "Total Earnings" ? "bg-success" : "bg-accent"} p-3 rounded-lg text-white text-2xl`}>{icon}</button>
        </div>
        <div>
            <h1 className='text-main text-4xl font-bold mt-5'>{
              title === "Total Earnings" ? `Rs${number}` : number}</h1>
            {subtitle ? (
              <p className='text-muted text-sm mt-2'>{subtitle}</p>
            ) : (
              <h1 className='text-main text-lg mt-2'><span className={footerNum < 0 ? 'text-[#ca0202]' : 'text-success'}>{footerNum >= 0 ? `+${footerNum}` : footerNum}%</span> than yesterday</h1>
            )}
        </div>
    </div>
  )
}

export default MiniCard