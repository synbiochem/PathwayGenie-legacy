'''
PathwayGenie (c) University of Manchester 2017

PathwayGenie is licensed under the MIT License.

To view a copy of this license, visit <http://opensource.org/licenses/MIT/>.

@author:  neilswainston
'''
import sys

from synbiochem.utils import plate_utils

from assembly_genie.build import BuildGenieBase


class OrderGenie(BuildGenieBase):
    '''Class implementing OrderGenie algorithms.'''

    def __init__(self, ice_details, ice_ids):
        super(OrderGenie, self).__init__(ice_details, ice_ids)

    def export_order(self):
        '''Exports a plasmids constituent parts for ordering.'''
        entries = {}

        for ice_id in self._ice_ids:
            data = self._get_data(ice_id)

            for part in data[0].get_metadata()['linkedParts']:
                data = self._get_data(part['partId'])
                entries[data[1]] = list(data[2:])

        return entries


def main(args):
    '''main method.'''
    from __builtin__ import str
    genie = OrderGenie({'url': args[0],
                        'username': args[1],
                        'password': args[2]},
                       args[3:])

    entries = genie.export_order()

    for idx, key in enumerate(sorted(entries)):
        print '\t'.join([str(val)
                         for val in [plate_utils.get_well(idx), key] +
                         entries[key]])


if __name__ == '__main__':
    main(sys.argv[1:])
