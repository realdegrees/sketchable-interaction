'use client'
import Tool from "@/ui/tool";

class Trash extends Tool {
    constructor() {
        super({
            label: 'Trash',
            color: 'red'
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
export default Trash;
