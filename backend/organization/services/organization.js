import Organization from "../models/organization";
export async function createOrganization(name) {
    const organization = new Organization({ name });
    await organization.save();
    console.log(`Organization "${name}" created successfully!`);
    return organization._id
}


export async function updateOrganization(organization_id, updatedData) {
    const organization = Organization.findByIdAndUpdate(organization_id, updatedData, { new: true })

}

export async function getOrganization(organization_id){
    const organization = await Organization.findById(organization_id)
    return organization
}