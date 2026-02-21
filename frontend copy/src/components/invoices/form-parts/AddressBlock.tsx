import { UseFormRegister } from 'react-hook-form';

interface AddressBlockProps {
  title: string;
  prefix: 'billedBy' | 'billedTo';
  register: UseFormRegister<any>;
}

export default function AddressBlock({ title, prefix, register }: AddressBlockProps) {
  return (
    <div className="bg-white/5 p-4 rounded-md border border-[rgba(15,23,42,0.06)]">
      <h3 className="text-sm font-bold text-slate-200 mb-3 border-b border-[rgba(15,23,42,0.06)] pb-2 border-dashed">
        {title}
      </h3>
      <div className="space-y-3">
        <select {...register(`${prefix}.country`)} className="w-full p-2 border rounded text-sm bg-white">
          <option value="India">India</option>
          <option value="Canada">Canada</option>
          <option value="USA">USA</option>
        </select>
        
        <input 
          {...register(`${prefix}.businessName`)} 
          placeholder="Business Name (required)" 
          className="w-full p-2 border rounded text-sm"
        />
        
        <div className="flex gap-2">
          <select className="w-20 p-2 border rounded text-sm bg-white">
            <option>+91</option>
            <option>+1</option>
          </select>
          <input 
            {...register(`${prefix}.phone`)} 
            placeholder="Phone" 
            className="w-full p-2 border rounded text-sm"
          />
        </div>

        <input {...register(`${prefix}.gstin`)} placeholder="GSTIN (optional)" className="w-full p-2 border rounded text-sm" />
        <input {...register(`${prefix}.address`)} placeholder="Address (optional)" className="w-full p-2 border rounded text-sm" />
        
        <div className="grid grid-cols-2 gap-2">
          <input {...register(`${prefix}.city`)} placeholder="City" className="w-full p-2 border rounded text-sm" />
          <input {...register(`${prefix}.zip`)} placeholder="Postal Code" className="w-full p-2 border rounded text-sm" />
        </div>
        
        <input {...register(`${prefix}.state`)} placeholder="State" className="w-full p-2 border rounded text-sm" />
        <input {...register(`${prefix}.email`)} placeholder="Email ID" className="w-full p-2 border rounded text-sm" />
        <input {...register(`${prefix}.pan`)} placeholder="PAN No" className="w-full p-2 border rounded text-sm" />
      </div>
    </div>
  );
}