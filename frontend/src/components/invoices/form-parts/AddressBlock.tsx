import { UseFormRegister } from 'react-hook-form';

interface AddressBlockProps {
  title: string;
  prefix: 'billedBy' | 'billedTo';
  register: UseFormRegister<any>;
}

export default function AddressBlock({ title, prefix, register }: AddressBlockProps) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
      <h3 className="text-sm font-bold text-gray-700 mb-3 border-b border-gray-200 pb-2 border-dashed">
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