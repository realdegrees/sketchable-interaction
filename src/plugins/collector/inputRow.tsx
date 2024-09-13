export const InputRow = ({ label, value, onChange }: { label: string, value: string, onChange: (value: string) => void }) => {
    return (
        <div className="flex flex-row justify-between pb-1 w-full overflow-hidden" onPointerDown={(e) => e.stopPropagation()} key={label + '-inputrow'}>
            {value && <label className="text-nowrap pr-2 ">{label}</label>}
            <input
                className="w-full text-black"
                id={label}
                value={value}
                placeholder={`Enter ${label}`}
                onChange={({ currentTarget: { value } }) => {
                    console.debug('change');
                    onChange(value);
                }}
            />
        </div>
    );
};