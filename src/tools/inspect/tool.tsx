'use client'
import Tool from "@/ui/tool";

class Inspect extends Tool {
    constructor(){
        super({
            label: 'Inspect',
            color: 'green'
        });
    }
    public drop(): void {
        throw new Error("Method not implemented.");
    }
    public enter(): void {
        throw new Error("Method not implemented.");
    }
    public leave(): void {
        throw new Error("Method not implemented.");
    }
}
export default Inspect;
