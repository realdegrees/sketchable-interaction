'use client'
import Tool from "@/ui/tool";


class Folder extends Tool {
    constructor() {
        super({
            label: 'Folder',
            color: 'gray'
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
export default Folder;
