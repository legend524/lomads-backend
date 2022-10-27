const _ = require('lodash');
const DAO = require('@server/modules/dao/dao.model')
const Member = require('@server/modules/member/member.model')
const Safe = require('@server/modules/safe/safe.model')
const ObjectId = require('mongodb').ObjectID;


const load = async (req, res) => {
    const { _id } = req.user;
    try {
        const dao = await DAO.find({ deletedAt: null, 'members.member': { $in: [ObjectId(_id)] } }).populate({ path: 'safe sbt members.member projects', populate: { path: 'owners members transactions' } }).exec()
        return res.status(200).json(dao)
    }
    catch (e) {
        console.error("dao.controller::load::", e)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

const create = async (req, res, next) => {
    const { contractAddress = "", url = null, name, description = null, image = null, members = [], safe = null } = req.body;
    const mMembers = []
    try {
        for (let index = 0; index < members.length; index++) {
            const member = members[index];
            const filter = { wallet: { $regex: new RegExp(`^${member.address}$`, "i") } }
            let m = await Member.findOne(filter);
            if (!m) {
                m = new Member({ wallet: member.address, name: member.name })
                m = await m.save();
            }
            //const m = await Member.findOneAndUpdate(filter, { wallet: member.address }, { new: true, upsert: true })
            mMembers.push(m)
        }
        let newSafe = null;
        let O = [];
        if (safe) {
            let { name, address, owners } = safe;
            O = owners.map(o => o.toLowerCase())
            newSafe = new Safe({ name, address: address, owners: mMembers.filter(m => O.indexOf(m.wallet.toLowerCase()) > -1).map(m => m._id) })
            newSafe = await newSafe.save();
        }

        let mem = mMembers.map(m => {
            return { member: m._id, creator: _.find(members, mem => mem.address.toLowerCase() === m.wallet.toLowerCase()).creator, role: O.indexOf(m.wallet.toLowerCase()) > -1 ? 'ADMIN' : 'CORE_CONTRIBUTOR' }
        })

        let daoURL = url;

        let dao = new DAO({
            contractAddress, url: daoURL, name, description, image, members: mem, safe: newSafe._id
        })

        dao = await dao.save();

        await Safe.findByIdAndUpdate(newSafe._id, { dao: dao._id }, { new: true })

        return res.status(200).json({ message: 'DAO created successfully' })
    }
    catch (e) {
        console.error("dao.controller::create::", e)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

const getByUrl = async (req, res) => {
    const { url } = req.params;
    try {
        const dao = await DAO.findOne({ url }).populate({ path: 'safe sbt members.member projects', populate: { path: 'owners members transactions' } })
        if (!dao)
            return res.status(404).json({ message: 'DAO not found' })
        return res.status(200).json(dao)
    }
    catch (e) {
        console.error("dao.controller::get::", e)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

const addDaoMember = async (req, res) => {

    const { _id } = req.user;
    const { url } = req.params;
    const { name, address } = req.body;

    try {
        //const dao = await DAO.findOne({ deletedAt: null, url, 'members.member': { $in: [ObjectId(_id)] } })
        const dao = await DAO.findOne({ deletedAt: null, url })
        if (!dao)
            return res.status(404).json({ message: 'DAO not found' })

        const filter = { wallet: { $regex: new RegExp(`^${address}$`, "i") } }
        let m = await Member.findOne(filter);
        if (!m) {
            m = new Member({ wallet: address, name })
            m = await m.save();
        }
        const userExistInDao = await DAO.findOne({ deletedAt: null, url, 'members.member': { $in: [m._id] } })
        if (userExistInDao)
            return res.status(500).json({ message: 'Member already exists in DAO' })

        await DAO.findOneAndUpdate(
            { _id: dao._id },
            { $addToSet: { members: { member: m._id, creator: false, role: 'CORE_CONTRIBUTOR' } } }
        )
        const d = await DAO.findOne({ url }).populate({ path: 'safe sbt members.member projects', populate: { path: 'owners members transactions' } })
        return res.status(200).json(d)
    }
    catch (e) {
        console.error("dao.addDaoMember::", e)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

const manageDaoMember = async (req, res) => {
    const { url } = req.params;
    const { deleteList, updateList } = req.body;

    try {
        const dao = await DAO.findOne({ deletedAt: null, url })
        if (!dao)
            return res.status(404).json({ message: 'DAO not found' })

        let members = dao.members;
        for (var i = 0; i < members.length; i++) {
            var user = members[i];

            // if included in delete array
            if (deleteList.includes(user.member.toString())) {
                members.splice(i, 1);
            }

            // if included in update array
            else if (updateList.some((ob) => ob.id === user._id.toString()) === true) {
                const index = updateList.map(object => object.id).indexOf(user._id.toString());
                members[i].role = updateList[index].role.toString();
            }
        }

        await DAO.findOneAndUpdate({ url }, { members });

        const d = await DAO.findOne({ url }).populate({ path: 'safe sbt members.member projects', populate: { path: 'owners members transactions' } });
        return res.status(200).json(d);
    }

    catch (e) {
        console.error("dao.manageDaoMember::", e)
        return res.status(500).json({ message: 'Something went wrong' })
    }
}

module.exports = { load, create, getByUrl, addDaoMember, manageDaoMember };